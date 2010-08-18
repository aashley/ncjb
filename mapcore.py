from google.appengine.ext import db

class System(db.Model):
	name = db.StringProperty()
	lat = db.FloatProperty()
	lng = db.FloatProperty()
