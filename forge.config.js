module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'TemAquiGestao',
    icon: './icon-512.png'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'TemAquiGestao',
        authors: 'Tem Aqui',
        description: 'Tem Aqui Gestão para Windows',
        setupExe: 'Tem-Aqui-Gestao-Setup.exe',
        noMsi: true
      }
    }
  ]
};
