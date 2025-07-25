// src/models/Reading.ts
import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@src/repos/SqliteDB';
import { Sensor } from './Sensor';

export interface ReadingAttributes {
  id: number;
  sensorId: number;
  timestamp: Date;
  value: number;
}

export type ReadingCreationAttributes =
  Optional<ReadingAttributes, 'id'>;

export class Reading
  extends Model<ReadingAttributes, ReadingCreationAttributes>
  implements ReadingAttributes {
  public id!: number;
  public sensorId!: number;
  public timestamp!: Date;
  public value!: number;

  // timestamps désactivés (pas de createdAt/updatedAt)
}

Reading.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    sensorId: {
      field: 'sensor_id',
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: Sensor, key: 'id' },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      // defaultValue retiré : timestamp doit être fourni par le client
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const raw = this.getDataValue('value');
        return raw === null ? null : parseFloat(raw as unknown as string);
      },
    },
  },
  {
    tableName: 'reading',
    sequelize,
    timestamps: false,
  }
);

// Associations
Reading.belongsTo(Sensor, {
  foreignKey: 'sensorId',
  targetKey: 'id',
  as: 'sensor',
});
Sensor.hasMany(Reading, {
  foreignKey: 'sensorId',
  sourceKey: 'id',
  as: 'readings',
});

export default Reading;
