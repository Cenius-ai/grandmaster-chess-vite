/**
 * player.js — Player entity as defined in the data model.
 * Fields: color ('white' | 'black'), type ('human' | 'computer')
 */
export class Player {
  /**
   * @param {'white' | 'black'} color
   * @param {'human' | 'computer'} type
   */
  constructor(color, type) {
    if (!['white', 'black'].includes(color)) {
      throw new Error(`Invalid player color: ${color}. Must be 'white' or 'black'.`);
    }
    if (!['human', 'computer'].includes(type)) {
      throw new Error(`Invalid player type: ${type}. Must be 'human' or 'computer'.`);
    }
    this.color = color;
    this.type = type;
  }

  /** Human-readable label */
  get label() {
    if (this.type === 'human') {
      return this.color === 'white' ? 'You (White)' : 'You (Black)';
    }
    return this.color === 'white' ? 'Computer (White)' : 'Computer (Black)';
  }

  /** Is this player controlled by a human? */
  get isHuman() {
    return this.type === 'human';
  }

  /** Is this player controlled by the computer? */
  get isComputer() {
    return this.type === 'computer';
  }
}
