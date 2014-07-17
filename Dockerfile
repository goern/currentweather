FROM dockerfile/nodejs

WORKDIR /root

ADD server.js /root/

EXPOSE 1337

CMD ["/usr/local/bin/node", "server.js"]