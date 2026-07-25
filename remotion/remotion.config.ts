import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
// The terminal mockup is flat colour and hard edges — no scaling artefacts wanted.
Config.setScale(1);
