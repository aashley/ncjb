import os
import pprint
import simplejson

from google.appengine.api import memcache
from google.appengine.ext import db, webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


#
# Data Model
#

class System(db.Model):
	name = db.StringProperty()
	lat = db.FloatProperty()
	lng = db.FloatProperty()

#
# Request Handlers
#

class Map(webapp.RequestHandler):
	def get(self):
		eveHeaders = getEveHeaders(self.request.headers)
		template_values = {
			'inEve': 'false',
			'currentSystem': 'null'
		}
		if 'solarsystemname' in eveHeaders and len(eveHeaders['solarsystemname']) > 0:
			template_values['inEve'] = 'true'
			template_values['currentSystem'] = '"' + eveHeaders['solarsystemname'] + '"';
		path = os.path.join(os.path.dirname(__file__), 'map.html')
		self.response.out.write(template.render(path, template_values))

class Editor(webapp.RequestHandler):
	def get(self):
		eveHeaders = getEveHeaders(self.request.headers)
		template_values = {
			'inEve': 'false',
			'currentSystem': 'null'
		}
		if 'solarsystemname' in eveHeaders and len(eveHeaders['solarsystemname']) > 0:
			template_values['inEve'] = 'true'
			template_values['currentSystem'] = '"' + eveHeaders['solarsystemname'] + '"';
		path = os.path.join(os.path.dirname(__file__), 'editor.html')
		self.response.out.write(template.render(path, template_values))

class EveHeaders(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		eveHeaders = getEveHeaders(self.request.headers)
		self.response.out.write(simplejson.dumps(eveHeaders))

class SystemsFeed(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/javascript'

		output = memcache.get("systemsFeed")
		if output is None:
			output = "var systems = ["
			first = True

			systems = System.gql("ORDER BY name")

			for system in systems:
				if first:
					first = False
				else:
					output += ",\n"
				output += "['%s', %.22f, %.22f]" % (system.name, system.lat, system.lng)

			output += "\n]"

			if not memcache.add("systemsFeed", output, 3600):
				logging.error("Storing systemsFeed in memcache failed.")
		self.response.out.write(output)

class EditorSave(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		result = {
			'success': True,
			'message': 'Success'
		}

		query = System.gql("WHERE name = :name", name=self.request.get('systemName'))
		if query.count() == 0:
			system = System(name=self.request.get('systemName'),
					lat=float(self.request.get('lat')),
					lng=float(self.request.get('lng')))
		else:
			system = query.get()
			system.name = self.request.get('systemName')
			system.lat = self.request.get('lat')
			system.lng = self.request.get('lng')

		system.put()

		memcache.delete('systemsFeed')
		self.response.out.write(simplejson.dumps(result))

class EditorDelete(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		result = {
			'success': True,
			'message': 'Success'
		}

		query = System.gql("WHERE name = :name", name=self.request.get('systemName'))
		if query.count() >= 1:
			system = query.get()
			system.delete()

		memcache.delete('systemsFeed')
		self.response.out.write(simplejson.dumps(result))

application = webapp.WSGIApplication(
		[
			('/eve', EveHeaders),
			('/systems', SystemsFeed),
			('/editor/save', EditorSave),
			('/editor/delete', EditorDelete),
			('/editor', Editor),
			('/.*', Map)
		],
		debug=True)

#
# Utility Functions
#

def getEveHeaders( headers):
	eveHeaders = {}
	for name in headers:
		if name.lower().count('eve-'):
			eveHeaders[name.lower().replace('eve-', '')] = headers[name]
	return eveHeaders

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
