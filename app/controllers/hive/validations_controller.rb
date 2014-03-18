# This is the controller where client side validation is posting the form to.
# Read about how it works in <tt>app/assets/javascripts/hive/validations.js.coffee</tt>

module Hive
  class ValidationsController < ApplicationController
    def validate
      model_name = params[:validate_model]
      id = params[:validate_record_id].to_i

      # Because we are only assigning but never saving it should be save to permit
      # all params. If this does not work though we would have the actual parameter
      # sanitizer of that model.
      unsave_params = params.require(model_name.to_sym).permit!

      unsave_params.delete :current_password

      if id > 0
        model = model_name.classify.constantize.find(id)
        model.assign_attributes(unsave_params)
      else
        model = model_name.classify.constantize.new(unsave_params)
      end

      if model.valid?
        render json: { }
      else
        render json: model.errors
      end
    end
  end
end
