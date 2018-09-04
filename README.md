This script can download all recordings defined by call history filter

Downloaded files are in directories YYYY\MM\DD in working directory

Recordings are not deleted from source!

Works on Linux, MS Windows and Mac OS X


# Install
Node.js 8.x required

Download and install Node.js https://nodejs.org/en/download/ 

Download scripts https://github.com/cervajs/download-recordings/archive/master.zip and unzip

Run terminal(Linux, Mac OS X) or cmd.exe on Windows

```shell
change directory to directory where scripts was unzipped
i.e. cd download-recordings-master
npm install
```

# Config  
Fill host and api credentials in config.js

Change filter for CDR list in index.js if you need (apiParams). Default is 6 months back.


# Run
Run terminal(Linux, Mac OS X) or cmd.exe on Windows

```shell
change directory to directory where scripts was unzipped
i.e. cd download-recordings-master
node index.js
```
