class CreateDeviseEasyOmniauthableAuthentications < ActiveRecord::Migration
  def change
    create_table(:devise_easy_omniauthable_authentications) do |t|
      t.integer :authenticatable_id
      t.string :authenticatable_type
      t.string :provider
      t.string :uid
      t.string :token
      t.string :token_secret

      t.timestamps
    end
  end
end
