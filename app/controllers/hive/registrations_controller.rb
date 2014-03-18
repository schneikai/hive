module Hive
  class RegistrationsController < Devise::RegistrationsController
    # DELETE /resource
    # Overwrite Devise destroy action to check if deleting devise models is enabled
    # and if delete requires a password.
    def destroy
      raise "The resource #{resource_name} is not deletable." unless resource.deletable?

      current_password = params[resource_name][:current_password] rescue nil

      if !resource.password_required_for_delete? || resource.valid_password?(current_password)
        resource.destroy
        Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name)
        set_flash_message :notice, :destroyed if is_navigational_format?
        respond_with_navigational(resource){ redirect_to after_sign_out_path_for(resource_name) }
      else
        resource.errors.add(:current_password, current_password.blank? ? :blank : :invalid)
        clean_up_passwords resource

        # respond_with did raise a unknow method 'user_url' error here. I believe
        # this has something to do with the request method beeing 'delete' because
        # respond_with works fine in the create and update action....
        # respond_with resource, location: after_destroy_path_for(resource)
        respond_to do |format|
          format.html { render :edit }
          format.xml  { render xml: resource.errors, status: :unprocessable_entity }
          format.json { render json: resource.errors, status: :unprocessable_entity }
        end
      end
    end
  end
end
