from google.appengine.ext import db
from google.appengine.tools import bulkloader
from models import *
import pprint

class SystemLoader(bulkloader.Loader):
	def __init__(self):
		bulkloader.Loader.__init__(self, 'System',
				[('constellation', self.getConstellation),
				 ('eveId', int),
				 ('name', str)])

	def getConstellation(self, constellationId):
		constellationId = int(constellationId)
		query = Constellation.gql("WHERE eveId = :constellationId", constellationId=constellationId)
		r = query.get()
		return r

loaders = [SystemLoader]
