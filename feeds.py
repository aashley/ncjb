import os
import simplejson
import pprint
import logging

from google.appengine.api import memcache, users
from google.appengine.ext import db, webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from models import *

class RegionsFeed(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		cacheKey = "regionFeed"

		output = memcache.get(cacheKey)
		if output is None:

			regions = Region.gql("ORDER BY name")

			finalRegions = []

			for region in regions:
				finalRegions.append({
						"id": region.eveId,
						"name": region.name
						})

			output = simplejson.dumps(finalRegions)

			if not memcache.add(cacheKey, output, 3600):
				logging.error("Storing regionFeed in memcache failed.")

		self.response.out.write(output)


class ConstellationsFeed(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		regionId = self.request.get('regionId')
		cacheKey = "constellationFeed" + regionId

		output = memcache.get(cacheKey)
		if output is None:

			query = Region.gql("WHERE eveId = :regionId",
					regionId=int(regionId))
			if query.count() == 0:
				logging.error("Unknown region id " + regionId + " supplied");
				return
			region = query.get()

			constellations = Constellation.gql("WHERE region = :region ORDER BY name",
					region=region)

			finalConstellations = []

			for constellation in constellations:
				finalConstellations.append({
						"id": constellation.eveId,
						"name": constellation.name,
						"regionId": constellation.region.eveId
						})

			output = simplejson.dumps(finalConstellations)

			if not memcache.add(cacheKey, output, 3600):
				logging.error("Storing constellationFeed in memcache failed.")

		self.response.out.write(output)

class SystemsFeed(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		mapType = self.request.get('mapType')
		if len(mapType) == 0:
			self.response.out.write(simplejson.dumps('No map type supplied'))
			return
		includeAllSystems = self.request.get('all')
		constellationId = self.request.get('constellationId')
		cacheKey = "systemsFeed" + mapType + constellationId + includeAllSystems

		output = memcache.get(cacheKey)
		if output is None:

			query = Constellation.gql("WHERE eveId = :constellationId",
					constellationId=int(constellationId))
			if query.count() == 0:
				logging.error("Unknown constellation id " + constellationId + " supplied");
				return
			constellation = query.get()

			systems = System.gql("WHERE constellation = :constellation ORDER BY name",
					constellation=constellation)

			finalSystems = []

			for system in systems:
				propertyName = mapType.lower() + 'Location'

				if getattr(system, propertyName) is None:
					if includeAllSystems == 'true':
						finalSystems.append(system.getJsonObject())
				else:
					finalSystems.append(system.getJsonObject())

			output = simplejson.dumps(finalSystems)

			if not memcache.add(cacheKey, output, 3600):
				logging.error("Storing systemsFeed in memcache failed.")

		self.response.out.write(output)

class SystemSearch(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		searchTerm = self.request.get('term')
		mapType = self.request.get('mapType')
		if len(mapType) == 0:
			self.response.out.write(simplejson.dumps('No map type supplied'))
			return
		includeAllSystems = self.request.get('all')
		cacheKey = 'systemSearch-' + searchTerm + mapType + includeAllSystems

		output = memcache.get(cacheKey)
		if output is None:
			if len(searchTerm) == 0:
				output = simplejson.dumps([]);
			else:
				query = System.gql('WHERE searchableName >= :1 AND searchableName < :2',
						searchTerm.lower(),
						searchTerm.lower() + u"\ufffd")

				propertyName = mapType.lower() + 'Location'

				searchResults = [];
				for system in query:
					if getattr(system, propertyName) is not None or includeAllSystems == 'true':
						searchResults.append({
								'label': system.name,
								'value': system.name
								});

				output = simplejson.dumps(searchResults)

			if not memcache.add(cacheKey, output, 3600):
				logging.error("Storing system search '" + searchTerm + "' in memcache failed.")
		
		self.response.out.write(output);

class SystemDetails(webapp.RequestHandler):
	def get(self):
		self.response.headers['Content-Type'] = 'application/json'

		systemName = self.request.get('name')
		if len(systemName) == 0:
			self.response.out.write(simplejson.dumps('No system name to lookup'))
			return

		cacheKey = "systemDetails" + systemName

		output = memcache.get(cacheKey)
		if output is None:

			systems = System.gql("WHERE searchableName = :1",
					systemName.lower())

			system = systems.get()
			output = simplejson.dumps(system.getJsonObject())

			if not memcache.add(cacheKey, output, 3600):
				logging.error("Storing systemsFeed in memcache failed.")

		self.response.out.write(output)


application = webapp.WSGIApplication(
		[
			('/feeds/regions', RegionsFeed),
			('/feeds/constellations', ConstellationsFeed),
			('/feeds/systems', SystemsFeed),
			('/feeds/systemSearch', SystemSearch),
			('/feeds/systemDetails', SystemDetails)
		],
		debug=True)

def main():
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
