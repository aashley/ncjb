from google.appengine.ext import db
from google.appengine.tools import bulkloader
from models import *
import pprint

class ConstellationLoader(bulkloader.Loader):
	def __init__(self):
		bulkloader.Loader.__init__(self, 'Constellation',
				[('region', self.getRegion),
				 ('eveId', int),
				 ('name', str)])

	def getRegion(self, regionId):
		regionId = int(regionId)
		query = Region.gql("WHERE eveId = :regionId", regionId=regionId)
		r = query.get()
		return r

loaders = [ConstellationLoader]
