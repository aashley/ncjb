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

class UtilWorker(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'text/plain'

		work = self.request.get('work')

		if work == 'flush':
			memcache.flush_all()
			self.response.out.write('memcache flushed')

		if work == 'region':
			regionId = self.request.get('regionId')
			region = Region.get(db.Key(regionId))
			region.searchableName = region.name.lower()
			region.put()
			self.response.out.write(region.name + ' searchable name updated')

		if work == 'constellation':
			constellationId = self.request.get('constellationId')
			constellation = Constellation.get(db.Key(constellationId))
			constellation.searchableName = constellation.name.lower()
			constellation.put()
			self.response.out.write(constellation.name + ' searchable name updated')

		if work == 'system':
			systemId = self.request.get('systemId')
			system = System.get(db.Key(systemId))
			system.searchableName = system.name.lower()
			system.put()
			self.response.out.write(system.name + ' searchable name updated')
		
		if work == 'queue-regions':
			count = 0
			self.response.out.write('Regions\n')
			regions = Region.gql("ORDER BY name")
			for region in regions:
				taskqueue.add(url='/worker',
						params={
							'work': 'region',
							'regionId': str(region.key())
						},
						method="GET")
				self.response.out.write('.')
				count += 1
				if count % 100 == 0:
					self.response.out.write('\n')
			self.response.out.write('\n')

		if work == 'queue-constellations':
			count = 0
			self.response.out.write('Constellations\n')
			constellations = Constellation.gql("ORDER BY name")
			for constellation in constellations:
				taskqueue.add(url='/worker',
						params={
							'work': 'constellation',
							'constellationId': str(constellation.key())
						},
						method="GET")
				self.response.out.write('.')
				count += 1
				if count % 100 == 0:
					self.response.out.write('\n')
			self.response.out.write('\n')

		if work == 'queue-systems':
			startChar = self.request.get('letter').upper()
			count = 0
			self.response.out.write('Systems\n')
			systems = System.gql("WHERE name >= :1 AND name < :2 ORDER BY name",
					startChar,
					startChar + u"\ufffd")
			for system in systems:
				taskqueue.add(url='/worker',
						params={
							'work': 'system',
							'systemId': str(system.key())
						},
						method="GET")
				self.response.out.write('.')
				count += 1
				if count % 100 == 0:
					self.response.out.write('\n')
			self.response.out.write('\n')

		if work == 'location':
			query = System.gql("WHERE eveId = :1", 30000211)
			system = query.get()
			system.saschaLocation = db.GeoPt(1, 2)
			system.siriusLocation = db.GeoPt(10, 20)
			system.put()
			self.response.out.write(system.to_xml())
			system.constellation.saschaHasLocations = True
			system.constellation.siriusHasLocations = True
			system.constellation.put()
			self.response.out.write(system.constellation.to_xml())
			system.constellation.region.saschaHasLocations = True
			system.constellation.region.siriusHasLocations = True
			system.constellation.region.put()
			self.response.out.write(system.constellation.region.to_xml())

application = webapp.WSGIApplication(
		[
			('/worker', UtilWorker)
		],
		debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
