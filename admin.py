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

class Admin(webapp.RequestHandler):
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
			path = os.path.join(os.path.dirname(__file__), 'admin.html')
			self.response.out.write(template.render(path, template_values))
		else:
			self.redirect(users.create_login_url(self.request.uri))

class AdminSave(webapp.RequestHandler):
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
			mapType = self.request.get('mapType');
	
			if query.count() == 0:
				result['success'] = False
				result['message'] = 'Unknown system name'
			else:
				system = query.get()
				key = self.request.get('suggestion')
				if key != 'none':
					key = db.Key(encoded=key)
					suggestion = SubmittedMapLocation.get(key)

					if suggestion.removeLocation is False:
						setattr(system,
								suggestion.mapType + 'Location',
								suggestion.location)
						system.put()
						result['message'] = 'Location for ' + system.name + ' updated.'
				else:
					result['message'] = 'All suggestions for ' + system.name + ' removed.'

				memcache.delete_multi(['systemsFeed' + mapType + str(system.constellation.eveId),
						'systemsFeed' + mapType + str(system.constellation.eveId) + 'true',
						'systemDetails' + system.name])

				submissions = SubmittedMapLocation.gql("WHERE mapType = :mapType AND system = :system",
						mapType=mapType,
						system=system)

				for submission in submissions:
					submission.delete()
		else:
			result['success'] = False
			result['message'] = 'Not Logged In'

		self.response.out.write(simplejson.dumps(result))

class SystemsWithSubmissions(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		mapType = self.request.get('mapType')

		submissions = SubmittedMapLocation.gql("WHERE mapType = :1", mapType)
		systemNames = []
		finalSystems = []

		for submission in submissions:
			if submission.system.name not in systemNames:
				finalSystems.append(submission.system.getJsonObject())
				systemNames.append(submission.system.name)

		output = simplejson.dumps(finalSystems)

		self.response.out.write(output)

class Submissions(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		mapType = self.request.get('mapType')
		systems = System.gql('WHERE searchableName = :1', self.request.get('systemName').lower())

		system = systems.get()

		submissions = SubmittedMapLocation.gql("WHERE mapType = :mapType AND system = :system",
				mapType=mapType,
				system=system);

		finalSubmissions = []
		for submission in submissions:
			finalSubmissions.append(submission.getJsonObject())

		output = simplejson.dumps(finalSubmissions)
		self.response.out.write(output)

class AdminSetMapVersion(webapp.RequestHandler):
	def get(self):
		query = TileVersion.all()
		tileVersion = query.get()
		if tileVersion is None:
			tileVersion = TileVersion(version=self.request.get('version'))
		else:
			tileVersion.version = self.request.get('version')

		tileVersion.put()

		self.response.out.write('Tile version updated to ' + self.request.get('version'))

application = webapp.WSGIApplication(
		[
			('/admin/save', AdminSave),
			('/admin/systemsWithSubmissions', SystemsWithSubmissions),
			('/admin/submissions', Submissions),
			('/admin/tiles', AdminSetMapVersion),
			('/admin', Admin)
		],
		debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
