export PYTHONPATH="/home/aashley/development/ncjb:$PYTHONPATH"
HOST="100.latest.nc-jb-map.appspot.com"
AUTH="aashley@adamashley.name"

~/build/google_appengine/appcfg.py -v upload_data -e $AUTH --url=http://${HOST}/_ah/remote_api --has_header --config_file=RegionLoader.py --filename=regions.csv --kind=Region .
~/build/google_appengine/appcfg.py -v upload_data -e $AUTH --url=http://${HOST}/_ah/remote_api --has_header --config_file=ConstellationLoader.py --filename=constellations.csv --kind=Constellation .
~/build/google_appengine/appcfg.py -v upload_data -e $AUTH --url=http://${HOST}/_ah/remote_api --has_header --config_file=SystemLoader.py --filename=solarsystems.csv --kind=System .
