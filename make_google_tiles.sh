#!/bin/bash

# Level 5
LVL_5_SIZE=8192
LVL_5_TILE_COUNT=32

LVL_6_SIZE=16384
LVL_6_TILE_COUNT=64

show_help()
{
	echo "$0 <source image> <number of images per row>";
	exit;
}

cut()
{
	ZOOMLEVEL=$1
	SOURCE=$2
	PERROW=$3
	TARGET_DIR=$4

	SCRATCH_SOURCE="scratch_$SOURCE";
	convert "$SOURCE" -colors 256 "$SCRATCH_SOURCE";
	convert -crop 256x256 "$SCRATCH_SOURCE" tile_%d.png;
	rm "$SCRATCH_SOURCE";
	TILECOUNT=`ls -1 tile_*.png | wc -l`;

	X=0;
	Y=0;
	mkdir -p tiles/$TARGET_DIR/$ZOOMLEVEL
	for (( c=0; c<$TILECOUNT; c++ ))
	do
		if [ $X -eq $PERROW ];
		then
			X=0;
			Y=$(( $Y+1 ));
		fi

#		echo "Tile: $c X: $X Y: $Y";
		mv tile_${c}.png tiles/$TARGET_DIR/$ZOOMLEVEL/tile_${X}_${Y}.png;
		mogrify -colors 256 -page 256x256 +profile "xmp" tiles/$TARGET_DIR/$ZOOMLEVEL/tile_${X}_${Y}.png;

		X=$(( $X+1 ));
	done
}

map_type()
{
	IMAGE_SRC=$1
	TARGET_FILE=`basename ${IMAGE_SRC}`
	TARGET_DIR=$2
	BASE_ZOOM_LEVEL=$3

	VAR_NAME="LVL_${BASE_ZOOM_LEVEL}_SIZE"
	eval BASE_SIZE=\$$VAR_NAME
	VAR_NAME="LVL_${BASE_ZOOM_LEVEL}_TILE_COUNT"
	eval BASE_TILE_COUNT=\$$VAR_NAME

	MOD_TIME=0
	if [ -e ${TARGET_FILE} ];
	then
		MOD_TIME=`stat -c %Y ${TARGET_FILE}`
	fi
	echo -n "Checking for updated map $IMAGE_SRC ... "
	wget --quiet -N $IMAGE_SRC
	NEW_MOD_TIME=`stat -c %Y ${TARGET_FILE}`
	if [ $MOD_TIME -ge $NEW_MOD_TIME ];
	then
		echo not found.
		return;
	fi
	echo found.

	cp ${TARGET_FILE} ${TARGET_DIR}.jpg

	echo Converting Original to zoom level $BASE_ZOOM_LEVEL size...
	convert ${TARGET_DIR}.jpg -background Black -gravity center -extent ${BASE_SIZE}x${BASE_SIZE} ${TARGET_DIR}.png

	zSize=$BASE_SIZE
	zCount=$BASE_TILE_COUNT
	for (( z=$BASE_ZOOM_LEVEL; z>=2; z-- ))
	do
		echo "Zoom Level $z (${zSize}px ${zCount} tiles)..."
		cut $z ${TARGET_DIR}.png $zCount $TARGET_DIR

		zSize=$(( zSize / 2 ))
		zCount=$(( zCount / 2 ))
		convert ${TARGET_DIR}.png -resize ${zSize}x${zSize} ${TARGET_DIR}_resized.png
		mv -f ${TARGET_DIR}_resized.png ${TARGET_DIR}.png
	done

	rm ${TARGET_DIR}.jpg ${TARGET_DIR}.png

	MOD_TIME=`stat -c %y ${TARGET_FILE}`
	MESSAGE="Updated ${TARGET_DIR} map at ${MOD_TIME}"

	svn commit -m "$MESSAGE" tiles/
}

map_type "http://www.benortherner.com/NorthernMap.jpg" "sascha" 6
map_type "http://map.hirr.net/northernjb.jpg" "sirius" 5
