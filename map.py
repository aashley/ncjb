import os
import pprint
import simplejson
import logging

from google.appengine.api import memcache, users
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
	mapType = db.StringProperty()

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
		user = users.get_current_user()

		if user:
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
		else:
			self.redirect(users.create_login_url(self.request.uri))

class EveHeaders(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		eveHeaders = getEveHeaders(self.request.headers)
		self.response.out.write(simplejson.dumps(eveHeaders))

class UpdateMapType(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/plain'

		systems = System.gql("ORDER BY name")

#		for system in systems:
#			if system.mapType != 'sascha' and system.mapType != 'sirius':
#				system.mapType='sirius'
#				system.put()
#				self.response.out.write(system.name + ' fixed\n')
		for system in systems:
			system.mapType = 'sascha'
			system.put()

			self.response.out.write(system.name + ' on sascha updated\n')

			newSystem = System(name=system.name,
					lat=system.lat,
					lng=system.lng,
					mapType='sirius')
			newSystem.put()

			self.response.out.write(system.name + ' on sirius created\n')

		memcache.delete('systemsFeed');
		memcache.delete('systemsFeedsascha');
		memcache.delete('systemsFeedsirius');

class SystemsFeed(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		mapType = self.request.get('mapType')

		output = memcache.get("systemsFeed" + mapType)
		if output is None:

			if len(mapType) > 0:
				systems = System.gql("WHERE mapType = :1 ORDER BY name", mapType)
			else:
				systems = System.gql("ORDER BY name")

			finalSystems = []

			for system in systems:
				finalSystems.append({
						"name": system.name,
						"lat": system.lat,
						"lng": system.lng,
						"mapType": system.mapType
						})

			output = simplejson.dumps(finalSystems)

			if not memcache.add("systemsFeed" + mapType, output, 3600):
				logging.error("Storing systemsFeed in memcache failed.")
		self.response.out.write(output)

class EditorSave(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		result = {
			'success': True,
			'message': 'Success'
		}

		query = System.gql("WHERE name = :name AND mapType = :mapType",
				name=self.request.get('systemName'),
				mapType=self.request.get('mapType'))

		if query.count() == 0:
			system = System(name=self.request.get('systemName'),
					lat=float(self.request.get('lat')),
					lng=float(self.request.get('lng')),
					mapType=self.request.get('mapType'))
		else:
			system = query.get()
			system.name = self.request.get('systemName')
			system.lat = float(self.request.get('lat'))
			system.lng = float(self.request.get('lng'))
			system.mapType = self.request.get('mapType')

		system.put()

		memcache.delete('systemsFeed')
		memcache.delete('systemsFeed' + self.request.get('mapType'))
		self.response.out.write(simplejson.dumps(result))

class EditorDelete(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'
		result = {
			'success': True,
			'message': 'Success'
		}

		query = System.gql("WHERE name = :name AND mapType = :mapType",
				name=self.request.get('systemName'),
				mapType=self.request.get('mapType'))

		if query.count() >= 1:
			system = query.get()
			system.delete()

		memcache.delete('systemsFeed')
		memcache.delete('systemsFeed' + self.request.get('mapType'))
		self.response.out.write(simplejson.dumps(result))

application = webapp.WSGIApplication(
		[
			('/updateMapType', UpdateMapType),
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
