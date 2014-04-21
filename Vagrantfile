Vagrant.configure("2") do |config|

  config.vm.define :ubuntu do |node|
      node.vm.box = "ubuntu-12.04-desktop"
      # node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/ubuntu-12.04-desktop.box"

      node.vm.hostname = :ubuntu
      node.vm.network :private_network, ip: "192.168.33.22"

      config.vm.provider :vmware_fusion do |v|
        v.gui = true
        v.vmx["memsize"] = "1024"
        v.vmx["numvcpus"] = "1"
      end
  end

  config.vm.define :osxmaverics do |node|
    node.vm.box = "osx-10.9-maverics"
    # node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/osx-10.9-maverics.box"

    node.vm.hostname = :osxmaverics
    node.vm.network :private_network, ip: "192.168.33.33"

    config.vm.provider :vmware_fusion do |v|
      v.gui = true
      v.vmx["memsize"] = "1024"
      v.vmx["numvcpus"] = "1"
    end
  end

  config.vm.define :win7 do |node|
    node.vm.box = "win-7"
    # node.vm.box_url = "https://s3.amazonaws.com/cliqz-vagrant-boxes/fusion/win-7.box"

    node.vm.guest = :windows
    node.vm.hostname = :win7

    node.windows.set_work_network = true

    node.vm.network :private_network, ip: "192.168.33.44"
    node.vm.network :forwarded_port, guest: 3389, host: 3389
    node.vm.network :forwarded_port, guest: 5985, host: 5985, id: "winrm", auto_correct: true

    node.vm.provider :vmware_fusion do |v|
      v.gui = true
      v.vmx["memsize"] = "1024"
      v.vmx["numvcpus"] = "1"
    end
  end
end
