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


# Run download cdr
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

node index.js -h vhXXX.ipex.cz -s "d513asdasd5661d/4d2asd88/cc94dasd58a" -k "1d6987b2asdasddd6b35fafa" -f "2018-08-05" -t "2018-08-07"
```

# Run check or download call reports
Run terminal(Linux, Mac OS X) or cmd.exe on Windows

```shell
change directory to directory where scripts was unzipped
i.e. cd download-recordings-master

show help
node reports.js -h

  Usage: reports [options]

  Options:

    -V, --version            output the version number
    -f, --date-from <value>  (REQUIRED) from date i.e 2018-08-01
    -t, --date-to <value>    (REQUIRED) to date i.e 2018-08-31
    -e, --email <value>      (REQUIRED) Email
    -p, --password <value>   (REQUIRED) User's password
    -d, --download           Specify this argument if you want to download found recordings
    -q, --queues <value>     Specify queue or queues for which should be recordings downloaded. In the case of multiple queues, separate their names with a comma e.g. Queue1,Queue2
    -h, --help               output usage information          output usage information

node reports.js -e email@ipex.cz -p password -f 2021-01-12 -t 2021-01-13 -q "Queue1, Queue2" -d

```

There is download.log diagnostic file with results after script ends.
