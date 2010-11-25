<?php

require_once 'AWSSDKforPHP/sdk.class.php';
require_once 'Console/ProgressBar.php';

$bucketName = 'nc-jb-map-tiles';
$start = time();

$baseDir = dirname(__FILE__) . '/tiles/';

$directoryIterator = new RecursiveDirectoryIterator($baseDir);
$recursiveIterator = new RecursiveIteratorIterator($directoryIterator);
$regexIterator = new RegexIterator($recursiveIterator, '/^.+\.png$/i', RecursiveRegexIterator::GET_MATCH);

$s3 = new AmazonS3();

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
			$upToDateCount++;
		}
		else
		{
			$upload = TRUE;
		}

		if( $upload )
		{
			$upload_response = $s3->create_object($bucketName, $filename, array(
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

