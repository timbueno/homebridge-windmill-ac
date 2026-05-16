/* eslint-disable no-console */
import readline from 'readline';
import type { Logging } from 'homebridge';
import { FanSpeed, Mode, WindmillService } from './services/WindmillService';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => rl.question(prompt, resolve));
};

const log = {
  debug: (...message: unknown[]) => console.debug('[debug]', ...message),
  info: (...message: unknown[]) => console.info(...message),
  warn: (...message: unknown[]) => console.warn(...message),
  error: (...message: unknown[]) => console.error(...message),
} as unknown as Logging;

async function printStatus(windmill: WindmillService): Promise<void> {
  const [
    power,
    currentTemperature,
    targetTemperature,
    mode,
    fanSpeed,
  ] = await Promise.all([
    windmill.getPower(),
    windmill.getCurrentTemperature(),
    windmill.getTargetTemperature(),
    windmill.getMode(),
    windmill.getFanSpeed(),
  ]);

  console.log('\nCurrent AC state');
  console.log(`  Power: ${power ? 'On' : 'Off'}`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Fan speed: ${fanSpeed}`);
  console.log(`  Current temp: ${currentTemperature} F`);
  console.log(`  Target temp: ${targetTemperature} F\n`);
}

async function chooseMode(windmill: WindmillService): Promise<void> {
  console.log('\nMode');
  console.log('  1. Cool');
  console.log('  2. Eco');
  console.log('  3. Fan');

  const choice = (await question('Choose mode: ')).trim();

  switch(choice) {
    case '1':
      await windmill.setMode(Mode.COOL);
      break;
    case '2':
      await windmill.setMode(Mode.ECO);
      break;
    case '3':
      await windmill.setMode(Mode.FAN);
      break;
    default:
      console.log('No mode changed.');
      return;
  }

  await printStatus(windmill);
}

async function chooseHomeKitTargetState(windmill: WindmillService): Promise<void> {
  console.log('\nHomeKit target state');
  console.log('  1. Off');
  console.log('  2. Cool');
  console.log('  3. Heat (Windmill fan mode)');
  console.log('  4. Auto (Windmill eco mode)');

  const choice = (await question('Choose HomeKit target state: ')).trim();

  if(choice === '1') {
    await windmill.setPower(false);
    await printStatus(windmill);
    return;
  }

  await windmill.setPower(true);

  switch(choice) {
    case '2':
      await windmill.setMode(Mode.COOL);
      break;
    case '3':
      await windmill.setMode(Mode.FAN);
      break;
    case '4':
      await windmill.setMode(Mode.ECO);
      break;
    default:
      console.log('No HomeKit target state changed.');
      return;
  }

  await printStatus(windmill);
}

async function chooseRawMode(windmill: WindmillService): Promise<void> {
  const value = (await question('\nRaw V3 mode value to send: ')).trim();

  if(!value) {
    console.log('No raw mode value sent.');
    return;
  }

  await windmill.setRawModeValue(value);
  await printStatus(windmill);
}

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch(error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Action failed: ${message}\n`);
  }
}

async function choosePower(windmill: WindmillService): Promise<void> {
  console.log('\nPower');
  console.log('  1. On');
  console.log('  2. Off');

  const choice = (await question('Choose power: ')).trim();

  switch(choice) {
    case '1':
      await windmill.setPower(true);
      break;
    case '2':
      await windmill.setPower(false);
      break;
    default:
      console.log('No power changed.');
      return;
  }

  await printStatus(windmill);
}

async function chooseFanSpeed(windmill: WindmillService): Promise<void> {
  console.log('\nFan speed');
  console.log('  1. Auto');
  console.log('  2. Low');
  console.log('  3. Medium');
  console.log('  4. High');

  const choice = (await question('Choose fan speed: ')).trim();

  switch(choice) {
    case '1':
      await windmill.setFanSpeed(FanSpeed.AUTO);
      break;
    case '2':
      await windmill.setFanSpeed(FanSpeed.LOW);
      break;
    case '3':
      await windmill.setFanSpeed(FanSpeed.MEDIUM);
      break;
    case '4':
      await windmill.setFanSpeed(FanSpeed.HIGH);
      break;
    default:
      console.log('No fan speed changed.');
      return;
  }

  await printStatus(windmill);
}

async function chooseTargetTemperature(windmill: WindmillService): Promise<void> {
  const rawValue = (await question('\nTarget temperature in Fahrenheit: ')).trim();
  const value = Number(rawValue);

  if(!Number.isFinite(value)) {
    console.log('No target temperature changed.');
    return;
  }

  await windmill.setTargetTemperature(value);
  await printStatus(windmill);
}

async function main(): Promise<void> {
  console.log('Windmill AC manual tester\n');

  const envToken = process.env.WINDMILL_TOKEN;
  const token = envToken || (await question('Windmill auth token: ')).trim();

  if(!token) {
    throw new Error('A Windmill auth token is required.');
  }

  const windmill = new WindmillService(token, log);
  await printStatus(windmill);

  let shouldContinue = true;

  while(shouldContinue) {
    console.log('Actions');
    console.log('  1. Refresh status');
    console.log('  2. Set mode');
    console.log('  3. Set power');
    console.log('  4. Set fan speed');
    console.log('  5. Set target temperature');
    console.log('  6. Set raw V3 mode value');
    console.log('  7. Simulate HomeKit target state');
    console.log('  q. Quit');

    const choice = (await question('Choose action: ')).trim().toLowerCase();

    switch(choice) {
      case '1':
        await runAction(() => printStatus(windmill));
        break;
      case '2':
        await runAction(() => chooseMode(windmill));
        break;
      case '3':
        await runAction(() => choosePower(windmill));
        break;
      case '4':
        await runAction(() => chooseFanSpeed(windmill));
        break;
      case '5':
        await runAction(() => chooseTargetTemperature(windmill));
        break;
      case '6':
        await runAction(() => chooseRawMode(windmill));
        break;
      case '7':
        await runAction(() => chooseHomeKitTargetState(windmill));
        break;
      case 'q':
      case 'quit':
      case 'exit':
        shouldContinue = false;
        break;
      default:
        console.log('Unknown action.\n');
    }
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exitCode = 1;
});
