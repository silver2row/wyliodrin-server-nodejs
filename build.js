"use strict";
var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var _ = require('underscore');
var mkdirp = require ('mkdirp');

var PATH_ERROR = 1;
var COPY_ERROR = 2;
var WGET_ERROR = 3;
var PATH_OK = 0;

var files = require('./files.js');
var log = require('./log.js');

var processArray = [];

var config = require ('./settings.js').config.config;
var buildFile = config.buildFile;
var mountPath = config.mountFile;

var gadget = config.board;

console.log("gadget = "+gadget);
//process.exit(1);

var networkConfig = require('./settings').config.networkConfig;
var port = networkConfig.port;

var signalTimeout = parseInt(networkConfig.timeout);

log.putLog ('Creating build directory in '+buildFile);
mkdirp.sync (buildFile);

function validatePath(id, returnPath)
{
	var validPath;
	if(id.indexOf('/') == -1)
		validPath = path.join(buildFile, id)
	else
		validPath = null;
	returnPath(validPath,id);
} 

function startBuildProcess(command, args, path, sendOutput, done, id, userid)
{
	var makeProcess = child_process.spawn(command,args,{cwd:path, env:_.extend(process.env,{wyliodrin_project:id,
		wyliodrinport:port, wyliodrin_userid:userid})});
	processArray[id] = makeProcess;
	makeProcess.stdout.on('data', function(data){
		// var out = new Buffer(data).toString('base64');
		sendOutput(data, 'stdout', null);
	});
	makeProcess.stderr.on('data', function(data){
		// var err = new Buffer(data).toString('base64');
		sendOutput(data, 'stderr', null);
	});
	makeProcess.on('close', function(code){
		sendOutput(null, null, code);
		processArray[id] = null;
	});
	// done();
} 

function make(id, command, args, address, userid, sendOutput)
{
	validatePath(id, function(buildPath,id)
	{
		if(buildPath)
		if(true)
		{
			console.log('build path');
			child_process.exec('rm -rf '+buildPath, {maxBuffer:10*1024, cwd:buildFile},
				function(error, stdout, stderr){
					if(files.canMount())
					{
						console.log('can mount');
						child_process.exec('cp -rfv '+mountPath+'/'+id+' '+buildFile+' && chmod -R u+w '+buildFile, {maxBuffer: 30*1024, cwd:buildFile}, 
						function(error, stdout, stderr){
							if (!error)
							{	
								console.log ('ln -s Makefile.'+gadget+' Makefile '+buildPath+'/'+id);
								child_process.exec ('ln -s Makefile.'+gadget+' Makefile', {cwd: buildPath}, function (err, stdout, stderr)
								{
									if (!error)
									{
										startBuildProcess(command,args,buildPath,sendOutput, id, userid);
									}
									else
									{
										console.log ('ln error: '+err);
										sendOutput ("ln error: "+err, "system", error.code);
									}
								});
							}
							else
							{
								console.log ('cp error: '+error);
								sendOutput ("cp error: "+error, "system", error.code);
							}
					
							/*if(!error)
							{
								startBuildProcess(command, args, buildPath, sendOutput);
							}
							else
							{
								sendOutput("Copy error", "system", error.code);
							}*/
						});
					}
					else
					{
						console.log('address = '+address);
						child_process.exec('wget --no-check-certificate '+address, {maxBuffer:30*1024, cwd:buildFile},function(error,stdout,stderr){
							if(!error)
							{
								console.log("fisier = "+path.basename(address));
								child_process.exec('tar xf '+path.basename(address), {maxBuffer:30*1024, cwd:buildFile},
									function(error, stdout, stderr){
										child_process.exec('rm -rf '+path.basename(address), {maxBuffer:30*1024, cwd:buildFile},
											function(error,stdout,stderr){

											});
										if(!error)
										{
											child_process.exec ('ln -s Makefile.'+gadget+' Makefile', {cwd: buildPath}, function (err, stdout, stderr)
											{
												if (!error)
												{
													startBuildProcess(command,args,buildPath,sendOutput, id, userid);
												}
												else
												{
													sendOutput ("ln error", "system", error.code);
												}
											});
										}
										else
											sendOutput("tar error", "system", error.code);
									});

							}
							else
							{
								console.log (error);
								sendOutput("Wget error", "system", error.code);
							}
						});
					}
			});						
		}
		else
		{
			sendOutput("Invalid path", "system",PATH_ERROR);
		}
	});
}

function killProcess(id)
{
	var process = processArray[id];
	if(process)
	{
		process.kill(process.pid, 'SIGTERM');
		setTimeout(function(){
			if(processArray[id])
				processArray[id].kill(processArray[id].pid, 'SIGKILL');
		},signalTimeout);
	}
}

exports.make = make;
