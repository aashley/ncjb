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

class Map(webapp.RequestHandler):
	def get(self):
		eveHeaders = getEveHeaders(self.request.headers)
		template_values = {
			'inEve': 'false',
			'currentSystem': 'null',
			'tileVersion': ''
		}
		query = TileVersion.all();
		tileVersion = query.get();
		template_values['tileVersion'] = tileVersion.version
		if 'solarsystemname' in eveHeaders and len(eveHeaders['solarsystemname']) > 0:
			template_values['inEve'] = 'true'
			template_values['currentSystem'] = '"' + eveHeaders['solarsystemname'] + '"';
		path = os.path.join(os.path.dirname(__file__), 'map.html')
		self.response.out.write(template.render(path, template_values))

class EveHeaders(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		eveHeaders = getEveHeaders(self.request.headers)
		self.response.out.write(simplejson.dumps(eveHeaders))

application = webapp.WSGIApplication(
		[
			('/eve', EveHeaders),
			('/.*', Map)
		],
		debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
