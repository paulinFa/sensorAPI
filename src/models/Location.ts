import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@src/repos/SqliteDB';

// Attributs du modèle Location
interface LocationAttributes {
  id: number;
  name: string;
}
// Type de création, seul 'id' est optionnel
export type LocationCreationAttributes = Optional<LocationAttributes, 'id'>;

export class Location
  extends Model<LocationAttributes, LocationCreationAttributes>
  implements LocationAttributes {
  public id!: number;
  public name!: string;
}

Location.init(
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
    },
  },
  {
    tableName: 'location',
    sequelize,
    timestamps: false,
  }
);