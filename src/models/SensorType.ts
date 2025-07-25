import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@src/repos/SqliteDB';

// Attributs du modèle SensorType
export interface SensorTypeAttributes {
  id: number;
  name: string;
  unit: string | null;
}
export type SensorTypeCreationAttributes = Optional<SensorTypeAttributes, 'id' | 'unit'>;

export class SensorType
  extends Model<SensorTypeAttributes, SensorTypeCreationAttributes>
  implements SensorTypeAttributes {
  public id!: number;
  public name!: string;
  public unit!: string | null;
}

SensorType.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: { msg: 'Name cannot be empty' } },
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'sensor_type',
    sequelize,
    timestamps: false,
  }
);