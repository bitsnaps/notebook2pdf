{ pkgs }: {
    deps = [
        pkgs.unzip
        pkgs.chromium
        pkgs.nodejs-18_x
        pkgs.sudo
        pkgs.unixtools.netstat
        pkgs.deno
    ];
    env = {
      NIXPKGS_ALLOW_INSECURE="1";
    };
}