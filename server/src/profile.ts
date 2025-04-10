import * as fs from 'fs';
import * as inspector from 'inspector';
import * as path from 'path';

export function startProfiling() {
  console.log('Starting CPU profiling');
  const session = new inspector.Session();
  session.connect();
  
  session.post('Profiler.enable', () => {
    session.post('Profiler.start', () => {
      // Run profiler for 30 seconds
      setTimeout(() => {
        session.post('Profiler.stop', (err, { profile }) => {
          if (err) {
            console.error('Profiling error:', err);
            return;
          }
          
          const filename = `profile-${Date.now()}.cpuprofile`;
          fs.writeFileSync(filename, JSON.stringify(profile));
          console.log(`Profile saved to ${path.resolve(filename)}`);
          session.disconnect();
        });
      }, 30000);
    });
  });
}