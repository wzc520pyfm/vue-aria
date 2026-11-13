/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 * for the specific language governing permissions and limitations under the License.
 */

import type {Key} from '../collections/types'

/**
 * Official `Selection` class: a `Set<Key>` plus `anchorKey` / `currentKey` for
 * range selection.
 * (`packages/react-stately/src/selection/Selection.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc)
 */
export class Selection extends Set<Key> {
  anchorKey: Key | null
  currentKey: Key | null

  constructor(keys?: Iterable<Key> | Selection, anchorKey?: Key | null, currentKey?: Key | null) {
    super(keys)
    if (keys instanceof Selection) {
      this.anchorKey = anchorKey ?? keys.anchorKey
      this.currentKey = currentKey ?? keys.currentKey
    } else {
      this.anchorKey = anchorKey ?? null
      this.currentKey = currentKey ?? null
    }
  }
}
