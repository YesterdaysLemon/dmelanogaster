import { spawnSync } from 'node:child_process';
if(!process.env.npm_execpath)throw new Error('Run this check with npm run verify');
for(const args of [['run','check'],['test'],['run','build']]){const result=spawnSync(process.execPath,[process.env.npm_execpath,...args],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
