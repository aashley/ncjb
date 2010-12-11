import os
import pprint
import simplejson
import logging

from google.appengine.api import taskqueue
from google.appengine.api import memcache, users
from google.appengine.ext import db, webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from models import *
from util import *


#
# Request Handlers
#

class Editor(webapp.RequestHandler):
	def get(self):
		user = users.get_current_user()

		if user:
			eveHeaders = getEveHeaders(self.request.headers)
			template_values = {
				'inEve': 'false',
				'currentSystem': 'null',
				'logoutUrl': users.create_logout_url('/'),
				'tileVersion': ''
			}
			query = TileVersion.all();
			tileVersion = query.get();
			template_values['tileVersion'] = tileVersion.version
			if 'solarsystemname' in eveHeaders and len(eveHeaders['solarsystemname']) > 0:
				template_values['inEve'] = 'true'
				template_values['currentSystem'] = '"' + eveHeaders['solarsystemname'] + '"';
			path = os.path.join(os.path.dirname(__file__), 'editor.html')
			self.response.out.write(template.render(path, template_values))
		else:
			self.redirect(users.create_login_url(self.request.uri))

class EditorSave(webapp.RequestHandler):
	def get(self):
		user = users.get_current_user()

		self.response.headers['Content-Type'] = 'application/json'
		result = {
			'success': True,
			'message': ''
		}
		
		if user:
			query = System.gql("WHERE name = :name",
					name=self.request.get('systemName'))
	
			if query.count() == 0:
				result['success'] = False
				result['message'] = 'Unknown system name'
			else:
				system = query.get()
				location = db.GeoPt(self.request.get('lat'),
						self.request.get('lon'))
				mapType = self.request.get('mapType')
				removeLocation = self.request.get('remove', False)
				if removeLocation is not False:
					removeLocation = True
					result['message'] = 'Removal of location for ' + system.name + ' has been added to approval queue.'
				else:
					result['message'] = 'New location for ' + system.name + ' has been added to approval queue.'
				submitted = SubmittedMapLocation(system=system,
						location=location,
						mapType=mapType,
						user=user,
						removeLocation=removeLocation)
				submitted.put()
		else:
			result['success'] = False
			result['message'] = 'Not Logged In'

		self.response.out.write(simplejson.dumps(result))

application = webapp.WSGIApplication(
		[
			('/editor/save', EditorSave),
			('/editor', Editor)
		],
		debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
