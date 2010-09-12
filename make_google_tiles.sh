#!/bin/bash

BASE_SIZE=8192
BASE_TILE_COUNT=32
BASE_ZOOM_LEVEL=5

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
	TARGET_DIR=$2

	echo Getting Original Map $IMAGE_SRC...
	wget --quiet -O base.jpg $IMAGE_SRC

	echo Converting Original to zoom level $BASE_ZOOM_LEVEL size...
	convert base.jpg -background Black -gravity center -extent ${BASE_SIZE}x${BASE_SIZE} base.png

	zSize=$BASE_SIZE
	zCount=$BASE_TILE_COUNT
	for (( z=$BASE_ZOOM_LEVEL; z>=2; z-- ))
	do
		echo "Zoom Level $z (${zSize}px ${zCount} tiles)..."
		cut $z base.png $zCount $TARGET_DIR

		zSize=$(( zSize / 2 ))
		zCount=$(( zCount / 2 ))
		convert base.png -resize ${zSize}x${zSize} base_resized.png
		mv -f base_resized.png base.png
	done

	rm base.jpg base.png
}

map_type "http://www.fenixdivina.com/ncjumpbridges_new.jpg" "sascha"
map_type "http://map.hirr.net/northernjb.jpg" "sirius"
