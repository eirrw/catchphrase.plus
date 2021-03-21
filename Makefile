SASS = ./node_modules/node-sass/bin/node-sass
ECO = ecosystem.config.js
APP = catchphrase.plus

help:
	echo 'npm-install'
	echo 'build-dev'
	echo 'build-prod'
	echo 'up-dev'
	echo 'up-prod'
	echo 'down'
	echo 'restart'

npm-install:
	npm ci

build-dev:
	$(SASS) assets/scss -o public/css

build-prod:
	$(SASS) --output-style compressed assets/scss -o public/css

up-dev:
	pm2 start $(ECO)

up-prod:
	pm2 start $(ECO) --env production

down:
	pm2 delete $(APP)

restart:
	pm2 restart $(APP)
