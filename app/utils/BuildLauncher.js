"use strict";

import DolphinResponse from "./DolphinResponse.js";
import DolphinActions from "./DolphinActions.js";
import DolphinChecker from "./DolphinChecker";
import {Build} from "./BuildData";
import child from 'child_process';
import path from 'path';

export default class DolphinLauncher{
	constructor(){
		this.child = null;
	}

	async launch(build, parameters = [], closePrevious){
		console.log('4');
		if(closePrevious)
		{
			if(!this.child)
			{
				console.log('6');
				return DolphinChecker.dolphinIsRunning()
					.then((isRunning)=>{
						const errorMessage = 'Dolphin is already opened. Please close all instances of dolphin!';
						if(isRunning)
						{
							throw errorMessage;
						}
					})
					.then(()=>{
						return this.close();
					})
					.then(()=>{
						return this.launchChild(build, parameters)
					})
					.catch( error =>{
						throw error;
					});

			}
			console.log('7');
			return this.close()
				.then(()=>{
					return this.launchChild(build, parameters)
				})
		}
		else
		{
			console.log('8');
			return this.launchChild(build, parameters);
		}
	}

	async host(build: Build){
		return this.launchChild(build);
	}

	async join(build: Build){
		return this.launchChild(build);
	}

	_retrieveActiveChild(){
		if(this.child)
		{
			if(this.child.exitCode !== null)
			{
				this.child = null;
			}
			else
			{
				return this.child;
			}
		}
		return null;
	}

	async close(){
		if(this._retrieveActiveChild())
		{
			console.log('the child', this.child);
			const killPromise = new Promise((resolve, reject) => {
				this.child.on('exit', (e)=>{
					this.child = null;
					console.log(10);
					resolve();
				});
			});
			this.child.kill();
			console.log(11);
			return killPromise;
		}
		else
		{
			console.log(12);
			return Promise.resolve();
		}
	}

	async launchChild(build: Build, parameters = []){
		console.log(5);
		return new Promise((resolve, reject)=>{
			if(!parameters)
			{
				parameters = [];
			}

			if(!build.executablePath())
			{
				reject('Attempted to launch '+ build.name + ' but the path is not set!');
				return;
			}

			if(this._retrieveActiveChild())
			{
				//Only one child allowed at a time, may consider throwing an error instead
				resolve(this.child);
				return;
			}

			this.child = child.spawn(path.resolve(build.executablePath()), parameters, {
				cwd: path.resolve(require('path').dirname(build.executablePath()))
			});

			this.child.on('error', (err) => {
				if(err && err.toString().includes('ENOENT'))
				{
					reject('Could not launch file at ' + path.resolve(build.executablePath()));
				}
				reject('Failed To Launch');
			});

			this.child.stdout.on('data', (data) => {
				resolve(this.child);
				console.log('stdout: ' + data);
				if(!data)
				{
					console.log('Empty?');
					return;
				}
				const strings = data.toString().split(/\r?\n/);
				console.log(data);
				for(let i in strings)
				{
					if(!strings.hasOwnProperty(i))
					{
						continue;
					}
					const stdout = strings[i];
					if(!stdout)
					{
						continue;
					}

					const result = DolphinResponse.parse(stdout);
					if(DolphinActions.isCallable(result.action))
					{
						build.changeIsSmartDolphin(true);
						if(!build.isTesting)
						{
							DolphinActions.call(result.action, build, result.value)
						}
					}
					else
					{
						console.warn('Unusable stdout', result);
					}
				}
			});

			const failTimeout = setTimeout(()=>{
				if(!this.child.pid)
				{
					reject('Child not found!');
				}
			},5000);
			if(this.child.pid)
			{
				clearTimeout(failTimeout);
				resolve(this.child);
			}
		});
	}

}