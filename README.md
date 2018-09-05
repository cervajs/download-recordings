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


# Run
Run terminal(Linux, Mac OS X) or cmd.exe on Windows

```shell
change directory to directory where scripts was unzipped
i.e. cd download-recordings-master

show help
node index.js -h

  Usage: index [options]

  Options:

    -V, --version             output the version number
    -f, --date-from <value>   from date i.e 2018-08-01
    -t, --date-to <value>     to date i.e 2018-08-31
    -h, --host <value>        (REQUIRED) PBX name
    -k, --api-key <value>     (REQUIRED) API key
    -s, --api-secret <value>  (REQUIRED) API key secret
    -h, --help                output usage information

node index.js -h vhXXX.ipex.cz -s 'd513asdasd5661d/4d2asd88/cc94dasd58a' -k '1d6987b2asdasddd6b35fafa' -f '2018-08-05' -t '2018-08-07'
```
