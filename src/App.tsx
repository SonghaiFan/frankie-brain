/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import BrainTrainer from './components/BrainTrainer';
import { MotionConfig } from 'motion/react';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrainTrainer />
    </MotionConfig>
  );
}
