{ pkgs }: {
  deps = [
       pkgs.pandoc
       pkgs.texlive-core
       pkgs.texlive-xetex
       pkgs.texlive-fontsrecommended
       pkgs.texlive-genericrecommended
  ];
}