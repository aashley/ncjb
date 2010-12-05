from google.appengine.ext import db
from google.appengine.tools import bulkloader
from models import *

class RegionLoader(bulkloader.Loader):
	def __init__(self):
		bulkloader.Loader.__init__(self, 'Region',
				[('eveId', int),
				 ('name', str)])

loaders = [RegionLoader]
