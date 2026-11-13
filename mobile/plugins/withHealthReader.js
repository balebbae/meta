const fs = require('fs');
const path = require('path');
const {withDangerousMod, withXcodeProject} = require('expo/config-plugins');

/** Copies the tracked HealthKit reader into the generated iOS project and compiles it. */
function withHealthReader(config) {
  config = withDangerousMod(config, [
    'ios',
    cfg => {
      const src = path.join(cfg.modRequest.projectRoot, 'native', 'HealthReader.m');
      const dest = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName, 'HealthReader.m');
      fs.mkdirSync(path.dirname(dest), {recursive: true});
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);
  config = withXcodeProject(config, cfg => {
    const project = cfg.modResults;
    const refs = project.hash?.project?.objects?.PBXFileReference ?? {};
    const present = Object.values(refs).some(file => file && String(file.path ?? '').includes('HealthReader.m'));
    if (!present) project.addSourceFile(`${cfg.modRequest.projectName}/HealthReader.m`, {target: project.getFirstTarget().uuid});
    return cfg;
  });
  return config;
}

module.exports = withHealthReader;
