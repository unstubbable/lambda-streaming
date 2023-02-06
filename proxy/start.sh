#!/usr/bin/env bash

export AWS_REGION=`curl -s http://169.254.169.254/latest/meta-data/placement/region`
export ORIGIN=http://`curl -s http://169.254.169.254/latest/meta-data/local-ipv4`
export LC_ALL="en_US.UTF-8"

. /.nvm/nvm.sh
npm start
