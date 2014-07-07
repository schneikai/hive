# This is the controller where client side validation is posting the form to.
# Read about how it works in <tt>app/assets/javascripts/hive/validations.js.coffee</tt>

# This won't work if it takes more than just assigning parameters to the model.
# For example if you have something in your controller that sets up relations
# before running validations you would need to duplicate that here or it wouldn't validate.

# I really think this should work like Rails <tt>strong_parameters</tt> where you
# have a little code in the controller that helps validating the model...
# General validations code in application controller that can be overwritten in
# model controller.

# This looks interesting: https://github.com/joecorcoran/judge
# Just tried it and it seems like it is not up to date. simple_form integration
# doesn't work out of the box. I still think, sending the model to the server
# might be a nice and simple way...

module Hive
  class ValidationsController < ApplicationController
    def validate
      model_name = params[:validate_model]
      id = params[:validate_record_id].to_i

      # Because we are only assigning but never saving it should be save to permit
      # all params. If this does not work though we would have the actual parameter
      # sanitizer of that model.
      unsave_params = params.require(model_name.to_sym).permit!

      # TODO: This is specific to the Devise user model and can't be here!
      current_password = unsave_params.delete(:current_password)
      # Devise is removing empty passwords from the params before assigning the
      # params and validating. We need to do this too...
      if unsave_params[:password].blank?
        unsave_params.delete(:password)
        unsave_params.delete(:password_confirmation) if unsave_params[:password_confirmation].blank?
      end

      if id > 0
        model = model_name.classify.constantize.find(id)
        model.assign_attributes(unsave_params)
      else
        model = model_name.classify.constantize.new(unsave_params)
      end

      if model.valid?
        render json: { }
      else
        # Convert attributes to field ids in the error messages because that's
        # what the validator uses to identify fields.
        errors = {}

        # When a spam protected form is used the field ids are randomized and
        # we need to translate the original field ids to those randomized
        # (aka safe) field ids.
        # TODO: This was added as a quick test when I added SpamFighter but
        # I don't know if this is the right place here.
        pp = ::SpamFighter::ParamsProtector.new(params)

        model.errors.each do |field, error|
          field_id = "#{model_name}_#{field}"
          safe_field_id = pp.to_save_field_id(field_id)

          field_id = safe_field_id if safe_field_id.present?

          errors[field_id] ||= []
          errors[field_id] << error
        end

        render json: errors
      end
    end
  end
end
