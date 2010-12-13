<?php

require_once 'AWSSDKforPHP/sdk.class.php';
require_once 'Console/ProgressBar.php';

$bucketName = 'nc-jb-map-tiles';
$distributionId = 'E1S5N0PGMPIF4S';
$start = time();

$baseDir = dirname(__FILE__) . '/tiles/';
$tileVersion = trim(`svnversion $baseDir`);

$directoryIterator = new RecursiveDirectoryIterator($baseDir);
$recursiveIterator = new RecursiveIteratorIterator($directoryIterator);
$regexIterator = new RegexIterator($recursiveIterator, '/^.+\.png$/i', RecursiveRegexIterator::GET_MATCH);

$s3 = new AmazonS3();
$cdn = new AmazonCloudFront();

$filesToUpload = array();
foreach( $regexIterator as $filename => $fileDetails )
{
	$targetFilename = str_replace($baseDir, '', $filename);
	$filesToUpload[] = $targetFilename;
}

$progress = new Console_ProgressBar("%fraction% [%bar%] %percent% ETA: %estimate%", '=>', '-', 76, count($filesToUpload), array('ansi_terminal' => true, 'ansi_clear' => true));

$count = 0;
$upToDateCount = 0;
$uploadedCount = 0;
$uploadedFiles = array();
$failedFiles = array();
foreach( $filesToUpload as $filename )
{
	$count++;

	try
	{
		$headers = $s3->get_object_headers($bucketName, $filename);

		$upload = FALSE;
		if( $headers->isOK() )
		{
			$md5 = md5_file($baseDir . $filename);
			$etag = str_replace('"', '', $headers->header['etag']);
			if( $md5 != $etag )
			{
				$upload = TRUE;
			}
			else
			{
				$upToDateCount++;
			}
		}
		else
		{
			$upload = TRUE;
		}
$upload = TRUE;

		if( $upload )
		{
			$upload_response = $s3->create_object($bucketName, $tileVersion . '/' . $filename, array(
						'fileUpload' => $baseDir . $filename,
						'acl' => AmazonS3::ACL_PUBLIC,
						'contentType' => 'image/png',
						'headers' => array(
							'Cache-Control' => 'max-age=259200'
							),
						'storage' => AmazonS3::STORAGE_REDUCED,
						));

			if( FALSE == $upload_response->isOK() )
			{
				$failedFiles[] = $filename;
				print "\n"
					.$upload_response->status . ' ' . $upload_response->body
					."\n";
			}
			else
			{
				$uploadedFiles[] = $filename;
				$uploadedCount++;
			}
		}
	}
	catch( Exception $e )
	{
		$failedFiles[] = $filename;
		print "\n"
			.$e->getMessage()
			."\n";
	}

	$progress->update($count);
}

print "\n";

$end = time();

print "Completed in " . $progress->_formatSeconds($end - $start) . ".\n";

if( $upToDateCount > 0 )
{
	print $upToDateCount . " files up to date.\n";
}

if( $uploadedCount > 0 )
{
	print $uploadedCount . " files uploaded.\n";
}

if( count($failedFiles) > 0 )
{
	print count($failedFiles) . " failed to upload.\n";
}

print "New tile version: " . $tileVersion . "\n";

/*
$invalidationStart = time();

print "Invalidating updated files from CDN...\n";

$start = 0;
while( $start < $uploadedCount )
{
	$files = array_slice($uploadedFiles, $start, 1000);
	$start += 1000;
	$response = $cdn->create_invalidation($distributionId, 'nc-jb-map-tiles ' . date('Y-m-d H:i:s'), $files);

	print $start;
	if( $response->isOK() )
	{
		while( $response->body->Status == 'InProgress' )
		{
			print '.';
			sleep(30);
			$response = $cdn->get_invalidation($distributionId, $response->body->Id);

			if( FALSE == $response->isOK() )
			{
				print $response->body->Error->Message . "\n";
				exit;
			}
		}
	}
	else
	{
		print $response->body->Error->Message . "\n";
		exit;
	}
	print "\n";
}

$invalidationStop = time();

print "Invalidation took " .  $progress->_formatSeconds($invalidationStop - $invalidationStart) . "\n";
*/
