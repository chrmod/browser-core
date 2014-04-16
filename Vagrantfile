Vagrant.configure("2") do |config|

    # config.vm.define :ubuntu do |node|
    #     node.vm.box = "ubuntu-12.04-desktop"
    #     node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/testing/ubuntu-12.04-desktop.box"

    #     node.vm.hostname = :ubuntu
    #     node.vm.network :private_network, ip: "192.168.205.22"

    #     config.vm.provider :virtualbox do |v|
    #       v.gui = true
    #       v.memory = 2048
    #       v.cpus = 2
    #       v.vram = 128
    #     end

    #     config.vm.provision :shell, inline: <<-eof
    #         #sudo apt-get update -y
    #         #sudo apt-get upgrade -y
    #         #sudo apt-get install -y wget curl python-pip build-essential g++ python-dev
    #         #sudo pip install --upgrade pip ansible

    #         cd /vagrant/tests/deployment/
    #         export ANSIBLE_HOST_KEY_CHECKING=False
    #         ansible-playbook bootstrap.yaml -i inventory.ini -s -u vagrant --private-key /home/vagrant/.ssh/vagrant
    #     eof
    # end

    config.vm.define :osxmaverics do |node|
      node.vm.box = "mac-os-x-10.9-maverics-fusion"
      node.vm.box_url = "file:///Users/bonya/Documents/Virtual\ Machines.localized/mac-os-x-10.9-maverics.box"

      # node.vm.hostname = :osxmaverics
      node.vm.network :private_network, ip: "192.168.22.10", :netmask => "255.255.0.0"

      config.vm.provider :vmware_fusion do |v|
        v.gui = true
        # v.vmx["memsize"] = "1024"
        # v.vmx["numvcpus"] = "2"
      end

      config.vm.provision :shell, inline: "echo whoami"
    end

end
