{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { flake-utils, nixpkgs, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        pythonEnv = pkgs.python310.withPackages (ps: [
          ps.pip
          ps.virtualenv
        ]);
      in
      {
        devShell = pkgs.mkShell
          {
            packages = [
              pkgs.python310
              pythonEnv
            ];
            LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
            shellHook = ''
              python -m venv ./.venv
              source ./.venv/bin/activate
              pip install -r requirements.txt
              pip install -r othello/requirements.txt
            '';
          };
      });
}
