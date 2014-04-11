require 'erb'

ff_versions = (25..28).to_a

ubuntu_inline = ERB.new(%{
    sudo apt-get update -y
    sudo apt-get install wget python-pip
    sudo pip install --upgrade pip
    sudo pip install ipython mozmill mozdownload paramiko

    if [ -d /opt/browsers/firefox/ ]; then
        sudo rm -r /opt/browsers/firefox/*
    fi

    sudo mkdir -p /opt/browsers/firefox

    sudo chown vagrant:vagrant -R /opt/browsers

    cd /opt/browsers/firefox

    <% ff_versions.each do |v| %>
    export VERSION="<%=v%>.0"
    echo "Installing FF $VERSION..."
    mozdownload -l de -d /opt/browsers/firefox -a firefox -p linux64 -t release -v $VERSION
    tar xvjf `ls *.tar.bz2` > /dev/null
    mv firefox $VERSION
    rm `ls *.tar.bz2`
    <% end %>
}).result(binding)


Vagrant.configure("2") do |config|

    config.vm.define :ubuntu do |node|
        node.vm.box = "ubuntu-12.04-desktop"
        node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/testing/ubuntu-12.04-desktop.box"

        node.vm.hostname = :ubuntu
        node.vm.network :private_network, ip: "192.168.33.22"

        config.vm.provider :virtualbox do |v|
          v.gui = true
          v.memory = 2048
          v.cpus = 2
          v.vram = 128
        end

        config.vm.provision :shell, inline: ubuntu_inline
    end

end