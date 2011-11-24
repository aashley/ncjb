#!/bin/bash

cut()
{
	ZOOMLEVEL=$1
	SOURCE=$2
	PERROW=$3
	TARGET_DIR=$4
	START_X=$5
	START_Y=$6

	#echo "cutting $PERROW tiles per row"
	#echo "X starts at $START_X"
	#echo "Y starts at $START_Y"

	SCRATCH_SOURCE="scratch_$SOURCE";
	#convert "$SOURCE" -colors 256 "$SCRATCH_SOURCE";
	cp $SOURCE $SCRATCH_SOURCE;
	convert -crop 256x256 "$SCRATCH_SOURCE" tile_%d.png;
	rm "$SCRATCH_SOURCE";
	TILECOUNT=`ls -1 tile_*.png | wc -l`;

	#echo "$TILECOUNT tiles where cut"

	X=$START_X;
	Y=$START_Y;
	mkdir -p tiles/$TARGET_DIR/$ZOOMLEVEL
	for (( c=0; c<$TILECOUNT; c++ ))
	do
		if [ $(( $X - $START_X )) -eq $PERROW ];
		then
			X=$START_X;
			Y=$(( $Y+1 ));
		fi

#		echo "Tile: $c X: $X Y: $Y";
#		mv tile_${c}.png tiles/$TARGET_DIR/$ZOOMLEVEL/tile_${X}_${Y}.png;
		#mogrify -colors 256 -page 256x256 +profile "*" tile_${c}.png;
		mogrify -page 256x256 +profile "*" tile_${c}.png;
		pngcrush -q tile_${c}.png tiles/$TARGET_DIR/$ZOOMLEVEL/tile_${X}_${Y}.png;
		rm tile_${c}.png;

		X=$(( $X+1 ));
	done
}

map_type()
{
	IMAGE_SRC=$1
	TARGET_FILE=`basename ${IMAGE_SRC}`
	TARGET_DIR=$2
	BASE_ZOOM_LEVEL=$3
	END_ZOOM_LEVEL=$4
	BACKGROUND_COLOR="$5"
	START_X=$6
	START_Y=$7

	if [ "z${START_X}" == "z" ];
	then
		START_X=0
	fi
	if [ "z${START_Y}" == "z" ];
	then
		START_Y=0
	fi

	echo Processing ${TARGET_FILE}...
	cp ${IMAGE_SRC} ${TARGET_DIR}.png

	BASE_SIZE=`identify -format "%[fx:w]" ${TARGET_DIR}.png`
	BASE_TILE_COUNT=$(( $BASE_SIZE / 256 ));

	zSize=$BASE_SIZE
	zCount=$BASE_TILE_COUNT
	for (( z=$BASE_ZOOM_LEVEL; z>=$END_ZOOM_LEVEL; z-- ))
	do
		echo "Zoom Level $z (${zSize}px ${zCount} tiles)..."
		cut $z ${TARGET_DIR}.png $zCount $TARGET_DIR $START_X $START_Y

		zSize=$(( zSize / 2 ))
		zCount=$(( zCount / 2 ))
		convert ${TARGET_DIR}.png -resize ${zSize}x${zSize} ${TARGET_DIR}_resized.png
		mv -f ${TARGET_DIR}_resized.png ${TARGET_DIR}.png
	done

	rm ${TARGET_DIR}.png
}

case "$1" in
"luxury-map")
	map_type "./originals/epra-luxury-map_16_x_53859_53860_y_38910_38911.png" "epra-luxury-map" 16 16 "#ffffff" 53859 38910;
	map_type "./originals/epra-luxury-map_17_x_107718_107720_y_77821_77823.png" "epra-luxury-map" 17 17 "#ffffff" 107718 77821;
	map_type "./originals/epra-luxury-map_18_x_215437_215441_y_155642_155647.png" "epra-luxury-map" 18 18 "#ffffff" 215437 155642;
	map_type "./originals/epra-luxury-map_19_x_430875_430883_y_311285_311294.png" "epra-luxury-map" 19 19 "#ffffff" 430875 311285;
	map_type "./originals/epra-luxury-map_20_x_861751_861767_y_622570_622589.png" "epra-luxury-map" 20 20 "#ffffff" 861751 622570;
	map_type "./originals/epra-luxury-map_21_x_1723501_1723534_y_1245142_1245179.png" "epra-luxury-map" 21 21 "#ffffff" 1723501 1245142;
	;;

*)
	echo "Please specify a map or set of maps to rebuild.";
	;;
esac;

