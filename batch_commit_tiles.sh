#!/bin/bash

MESSAGE="$1"
BASEDIR=`dirname "$0"`

for dir in `ls -1 ${BASEDIR}/tiles`
do
	for zoom in {2..5}
	do
		for x in {0..32}
		do
			svn commit -m "$1 - ${dir} Zoom ${zoom} Section ${x}" ${BASEDIR}/tiles/${dir}/${zoom}/tile_${x}_*
		done
	done
done
