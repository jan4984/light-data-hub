# lightweight data hub

for upload and share files

## browser

for uploader, require chrome 86 and abover.

## config

* env `DB_PATH` the sqlite file path
* env `FILE_PATH` the files storage directory

## run
### bare-metal

```shell
npm i
./entrypoint.sh
```

### container

```
docker run -v$PWD/db.sqlite:/mydb -e DB_PATH=/mydb -v$PWD/files:/myfiles -e FILE_PATH=/myfiles light-data-hub:latest
```

## test

```shell
npx mocha test
```