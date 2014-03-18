class DeviseAttributableAddFieldsToUsers < ActiveRecord::Migration
  def change
    add_column :users, :username, :string, unique: true
    add_column :users, :company, :string
    add_column :users, :first_name, :string
    add_column :users, :last_name, :string
    add_column :users, :address1, :string
    add_column :users, :address2, :string
    add_column :users, :zip, :string
    add_column :users, :city, :string
    add_column :users, :state, :string
    add_column :users, :country, :string

    add_index :users, :username, unique: true
  end
end
