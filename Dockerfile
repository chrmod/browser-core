FROM node:5.11.1

RUN npm install -g \
  bower \
  broccoli-cli

RUN apt-get update && \
  apt-get install -y \
    build-essential \
    python-dev \
    python-pip \
    zip

RUN pip install \
  fabric \
  jinja2 \
  awscli \
  requests \
  pycrypto \
  argparse

RUN cd /tmp && \
  wget https://www.openssl.org/source/old/0.9.x/openssl-0.9.8zg.tar.gz && \
  tar zxf openssl-0.9.8zg.tar.gz && \
  cd openssl-0.9.8zg && \
  ./config && \
  make && \
  make install
ENV PATH "/usr/local/ssl/bin:$PATH"

RUN groupadd jenkins -g 119 && \
  useradd -ms /bin/bash jenkins -u 109 -g 119
