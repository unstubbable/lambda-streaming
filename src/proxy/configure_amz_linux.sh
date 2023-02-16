#!/bin/bash -e

if [[ "$1" != "" ]]; then
    PROXY_SERVER_ZIP="$1"
else
    echo "Please specify the location of the proxy server zip."
    exit 1
fi

if [[ "$2" != "" ]]; then
    LAMBDA_FUNCTION_NAME="$2"
else
    echo "Please specify the lambda function name."
    exit 1
fi

amazon-linux-extras install -y nginx1

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
NVM_DIR="/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 16

mkdir -p /var/www/proxy-server
cp $PROXY_SERVER_ZIP /var/www/proxy-server/proxy-server.zip
cd /var/www/proxy-server
unzip proxy-server.zip
rm proxy-server.zip
npm install

chmod +x /var/www/proxy-server/start.sh
usermod -a -G nginx ec2-user
chown ec2-user:nginx -R ./*
chown ec2-user:nginx /var/www
chown ec2-user:nginx /var/www/proxy-server

cp nginx.conf /etc/nginx/conf.d/nginx.conf
systemctl enable nginx.service
systemctl start nginx.service
systemctl status nginx.service

echo "Environment=\"LAMBDA_FUNCTION_NAME=$LAMBDA_FUNCTION_NAME\"" >> node_server.service
cat node_server.service
cp node_server.service /usr/lib/systemd/system/node_server.service
systemctl daemon-reload
systemctl enable node_server.service
systemctl start node_server.service
systemctl status node_server.service
