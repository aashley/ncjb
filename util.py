
def getEveHeaders( headers ):
	eveHeaders = {}
	for name in headers:
		if name.lower().count('eve-'):
			eveHeaders[name.lower().replace('eve-', '')] = headers[name]
	return eveHeaders

