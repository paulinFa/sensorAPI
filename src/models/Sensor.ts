import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@src/repos/SqliteDB';
import { SensorType } from './SensorType';
import { Location } from './Location';

// Attributs du modèle Sensor
export interface SensorAttributes {
  id: number;
  name: string;
  typeId: number;
  locationId: number;
  serialNumber?: string | null;
}
export type SensorCreationAttributes = Optional<SensorAttributes, 'id' | 'serialNumber'>;

export class Sensor
  extends Model<SensorAttributes, SensorCreationAttributes>
  implements SensorAttributes {
  public id!: number;
  public name!: string;
  public typeId!: number;
  public locationId!: number;
  public serialNumber!: string | null;
}

Sensor.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: { msg: 'Name cannot be empty' } },
    },
    typeId: {
      field: 'type_id',
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: SensorType, key: 'id' },
    },
    locationId: {
      field: 'location_id',
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: Location, key: 'id' },
    },
    serialNumber: {
      field: 'serial_number',
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'sensor',
    sequelize,
    timestamps: false,
  }
);

Sensor.belongsTo(SensorType, { foreignKey: 'type_id', as: 'type' });
Sensor.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });
SensorType.hasMany(Sensor, { foreignKey: 'type_id', as: 'sensors' });
Location.hasMany(Sensor, { foreignKey: 'location_id', as: 'sensors' });