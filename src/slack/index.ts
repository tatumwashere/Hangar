import { App, AuthorizeResult, ExpressReceiver, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import actions from './actions';
import events from './events';
import views from './views';
import { env } from '../env';
import { Config } from '../entities/config';

export const receiver = new ExpressReceiver({ signingSecret: null });
let authorizeResult: AuthorizeResult;

let logLevel: LogLevel;
if (env.slackLogLevel) {
  logLevel = env.slackLogLevel as LogLevel;
} else {
  logLevel = env.nodeEnv === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
}

type BoltAuthorize = () => Promise<AuthorizeResult>
const authorize = (botToken: string): BoltAuthorize => () => {

  // See if we already have the auth result;
  // if so, use that instead of hitting the API again
  if (authorizeResult) {
    return authorizeResult;
  }

  if (env.nodeEnv === 'test') {
    // During testing, avoid hittin the API and use junk data
    authorizeResult = {
      botToken: 'junk test token',
      botId: 'junk bot id',
      botUserId: 'junk bot user id',
    };
    return authorizeResult;
  }

  const client = new WebClient(botToken);
  const auth = (await client.auth.test()) as { [id: string]: string };
  authorizeResult = {
    botToken,
    botId: auth.bot_id,
    botUserId: auth.user_id,
  };

  return authorizeResult;

}
// async function authorize(): Promise<AuthorizeResult> {
//   // See if we already have the auth result;
//   // if so, use that instead of hitting the API again
//   if (authorizeResult) {
//     return authorizeResult;
//   }

//   if (env.nodeEnv === 'test') {
//     // During testing, avoid hittin the API and use junk data
//     authorizeResult = {
//       botToken: 'junk test token',
//       botId: 'junk bot id',
//       botUserId: 'junk bot user id',
//     };
//     return authorizeResult;
//   }

//   const client = new WebClient(botToken);
//   const auth = (await client.auth.test()) as { [id: string]: string };
//   authorizeResult = {
//     botToken,
//     botId: auth.bot_id,
//     botUserId: auth.user_id,
//   };

//   return authorizeResult;
// }


export const getSlackAppAndInitListeners = async (): Promise<Express> => {
  const token = token ?? await Config.getValueAs('slackBotToken', 'string', false);
  // Create a new bolt app using the receiver instance and authorize method above
  const app = new App({
    receiver,
    logLevel,
    authorize(token),
  });
  actions(app);
  events(app);
  views(app);
  return receiver.app;
};
